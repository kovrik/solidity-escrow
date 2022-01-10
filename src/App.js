import './App.css';

import { ethers } from 'ethers'
import { useState, useEffect } from 'react';
import EscrowArtifact from "./artifacts/contracts/Escrow.sol/Escrow.json"

const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"

function App() {

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const [contract, setContract] = useState(false);

    async function _intializeContract(init) {
        // We first initialize ethers by creating a provider using window.ethereum
        // Then we initialize the contract using that provider and the contract's artifact.
        const _contract = new ethers.Contract(contractAddress, EscrowArtifact.abi, init)
        setContract(_contract);
        return contract;
    }

    const processPaymentsResult = (result) => {
        return result.map((r) => {
            return {
                id: r.id.toString(),
                from: r.from.toString(),
                amount: r.amount.toString()
            };
        })
    }


    const Account = () => {
        const [account, setAccount] = useState(false)

        const getAccount = async () => {
            if (typeof window.ethereum !== 'undefined') {
                // Prompt user for account connections
                const [_account] = await window.ethereum.request({ method: 'eth_requestAccounts' })
                setAccount(_account);
                return _account;
            }
        }

        return (<div>
                {account ? <div>Your Account: {account}</div> : null}
                {account ? null : <button onClick={getAccount}>Connect MetaMask</button>}
                </div>)
    }

    const Deposit = () => {
        const [userAccountId, setUserAccountId] = useState(false)
        const [amount, setAmount] = useState(false)

        const contract = new ethers.Contract(contractAddress, EscrowArtifact.abi, signer);

        const deposit = async (e) => {
            e.preventDefault();
            console.log("UserAccountId: ", userAccountId);
            const contract = new ethers.Contract(contractAddress, EscrowArtifact.abi, signer);
            contract.deposit(userAccountId, {value: ethers.utils.parseEther(amount)});
        }

        return (
                <div>
                Sent to&nbsp;
                <input size="50" onChange={e => setUserAccountId(e.target.value)} placeholder="Account ID" />
                <input onChange={e => setAmount(e.target.value)} placeholder="Amount" />
                <button onClick={  e  => deposit(e) }>Deposit</button>
                </div>
        )
    }

    // TODO
    const Receive = () => {

        const [payments, setPayments] = useState(false);

        const contract = new ethers.Contract(contractAddress, EscrowArtifact.abi, signer);

        const claim = (paymentId) => {
            console.log("Claiming: ", paymentId);
            const contract = new ethers.Contract(contractAddress, EscrowArtifact.abi, signer);
            contract.claim(paymentId);
        }

        const getPayments = async () => {
            const contract = new ethers.Contract(contractAddress, EscrowArtifact.abi, signer);
            const _payments = await contract.getPayments();
            const processed = processPaymentsResult(await _payments);
            console.log(_payments);
            console.log("Processed: ", processed);
            setPayments(processed);
            return processed;
        }

        return (
                <div>
                <div>Receive</div>

                <button onClick={ () => getPayments() }>Get Payments</button> 

                <table width="100%">
                <tbody>
                <tr>
                    <td>ID</td>
                    <td>From</td>
                    <td>Amount (Eth)</td>
                    <td></td>
                </tr>
                {payments ? payments.map((member) => (
                <tr key={member.id}>
                    <td className="tableCell">
                        {member.id}
                    </td>
                    <td className="tableCell">
                        {member.from}
                    </td>
                    <td className="tableCell">
                        {ethers.utils.formatEther(member.amount)}
                    </td>
                    <td className="tableCell">
                        <button onClick={ () => claim(member.id) }>Claim</button>
                    </td>
                  </tr>
                )) : null}
</tbody>
                </table>
                </div>
        )
    }

    return (
            <div className="App">
                <header className="App-header">
                <div>Escrow</div>
                <div>
                <Account/>

                <Deposit/>
                <span height="100"></span>
                <Receive/>
                </div>
                </header>
            </div>
    );
}

export default App;